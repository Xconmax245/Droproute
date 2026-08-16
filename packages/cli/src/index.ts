#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import * as diff from 'diff';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import {
  checkPreconditions,
  runInjection,
  findRootLayout,
  findFirstScreen,
  detectExistingConditional,
  writeManifest,
  readManifest,
  deleteManifest,
  getStatus,
  manifestExists,
} from '@droproute/codemod';
import { Project } from 'ts-morph';
import { analyzeInjectionPoints } from './ai-analysis';

// Load .env from repo root
const repoRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });

const SERVER_URL = process.env.SERVER_PUBLIC_URL ?? 'http://localhost:8787';

const program = new Command();

program
  .name('droproute')
  .description('Wire in referral attribution to your Expo Router app')
  .version('1.0.0');

// ─── inject ──────────────────────────────────────────────────────────────────

program
  .command('inject [path]')
  .description('Inject the DropRoute attribution SDK into an Expo Router app')
  .option('--dry-run', 'Preview changes without writing to disk')
  .action(async (targetPath: string | undefined, options: { dryRun?: boolean }) => {
    const targetDir = path.resolve(targetPath ?? '.');
    const isDryRun = options.dryRun ?? false;

    console.log('');
    console.log(
      chalk.bold(isDryRun ? '🔍  DropRoute dry-run preview' : '🚀  DropRoute inject')
    );
    console.log(chalk.dim(`Target: ${targetDir}`));
    console.log('');

    // Step 1: Preconditions
    const precondSpinner = ora('Checking preconditions...').start();
    const precond = checkPreconditions(targetDir);
    if (!precond.ok) {
      precondSpinner.fail('Preconditions failed');
      console.error(chalk.red('\n✖  ' + precond.error));
      process.exit(1);
    }
    precondSpinner.succeed('Preconditions OK');

    if (!isDryRun && manifestExists(targetDir)) {
      console.error(
        chalk.red('\n✖  A .droproute/manifest.json already exists — this project appears to be injected already.')
      );
      console.error(chalk.dim('  Run `droproute rollback` first if you want to re-inject.'));
      process.exit(1);
    }

    const appDir = precond.appDir!;

    // Step 2: Locate files (heuristic — AI step will validate/override in §5.1)
    const rootLayoutPath = findRootLayout(appDir);
    const firstScreenPath = findFirstScreen(appDir);

    if (!rootLayoutPath) {
      console.error(chalk.red('\n✖  Could not find app/_layout.tsx (or .ts/.jsx/.js). Expo Router requires a root layout.'));
      process.exit(1);
    }
    if (!firstScreenPath) {
      console.error(chalk.red('\n✖  Could not find a first screen (index.tsx or equivalent) in /app.'));
      process.exit(1);
    }

    // Step 3: Detect existing conditional in first screen (heuristic fallback for AI context)
    const project = new Project({ useInMemoryFileSystem: true });
    const firstScreenContent = fs.readFileSync(firstScreenPath, 'utf-8');
    project.createSourceFile(firstScreenPath, firstScreenContent);
    const firstScreenSF = project.getSourceFileOrThrow(firstScreenPath);
    const hasExistingConditionalHeuristic = detectExistingConditional(firstScreenSF);

    // Step 4: §5.1 — AI injection-point analysis
    const aiSpinner = ora('Analysing project with AI (§5.1)...').start();
    let plan;
    try {
      plan = await analyzeInjectionPoints(appDir, rootLayoutPath, firstScreenPath);
      aiSpinner.succeed(`AI analysis: root=${path.basename(plan.rootLayoutPath)}, screen=${path.basename(plan.firstScreenPath)}`);
      if (plan.rationale) {
        console.log(chalk.dim(`  Rationale: ${plan.rationale}`));
      }
    } catch (err: any) {
      if (process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY) {
        aiSpinner.fail('AI analysis failed');
        console.error(chalk.red('\n✖  ' + (err.message ?? err)));
        process.exit(1);
      } else {
        // No API key — fall back to heuristic with warning
        aiSpinner.warn('OPENROUTER_API_KEY not set — using heuristic injection point detection');
        plan = {
          rootLayoutPath,
          firstScreenPath,
          hasExistingConditional: hasExistingConditionalHeuristic,
          rationale: 'Heuristic: standard Expo Router file conventions (no API key)',
        };
      }
    }

    // Step 4: Run injection (dry-run or real)
    const injectSpinner = ora(isDryRun ? 'Computing diff...' : 'Applying changes...').start();

    let result;
    try {
      result = runInjection(plan, targetDir, SERVER_URL, isDryRun);
      injectSpinner.succeed(isDryRun ? 'Diff computed' : 'Changes applied');
    } catch (err: any) {
      injectSpinner.fail('Injection failed');
      console.error(chalk.red('\n✖  ' + (err.message ?? err)));
      process.exit(1);
    }

    // Step 5: Print diff
    console.log('');
    for (const change of result.changes) {
      if (change.originalContent === change.newContent) continue;
      const patchTitle = chalk.cyan.bold(`─── ${change.relativePath} ───`);
      console.log(patchTitle);
      const patch = diff.createPatch(
        change.relativePath,
        change.originalContent,
        change.newContent,
        'before',
        'after'
      );
      for (const line of patch.split('\n').slice(4)) {
        if (line.startsWith('+')) {
          process.stdout.write(chalk.green(line) + '\n');
        } else if (line.startsWith('-')) {
          process.stdout.write(chalk.red(line) + '\n');
        } else if (line.startsWith('@@')) {
          process.stdout.write(chalk.cyan(line) + '\n');
        } else {
          process.stdout.write(chalk.dim(line) + '\n');
        }
      }
      console.log('');
    }

    if (isDryRun) {
      console.log(chalk.yellow.bold('ℹ  Dry run complete. No files were written.'));
      console.log(chalk.dim('  Run without --dry-run to apply these changes.'));
      return;
    }

    // Step 6: Write manifest (non-dry-run only)
    const manifestSpinner = ora('Writing manifest...').start();
    writeManifest(
      targetDir,
      result.changes.map((c) => ({
        relativePath: c.relativePath,
        originalContent: c.originalContent,
      }))
    );
    manifestSpinner.succeed('Manifest written to .droproute/manifest.json');

    // Step 7: Success box
    const summary = [
      chalk.bold('DropRoute injection complete!'),
      '',
      chalk.dim('Files changed:'),
      ...result.filesChanged.map((f) => `  ${chalk.green('+')} ${f}`),
      '',
      `${chalk.bold(result.linesAdded.toString())} lines added`,
      `${chalk.bold(result.filesChanged.length.toString())} files modified`,
      '',
      chalk.bold.green('✓ Attribution SDK wired in'),
      chalk.bold.green('✓ Onboarding variant routing active'),
      chalk.bold.green('✓ Deep-link scheme configured'),
      '',
      chalk.dim(`Server URL: ${SERVER_URL}`),
      chalk.dim('Run `droproute status` to verify • `droproute rollback` to undo'),
    ].join('\n');

    console.log(
      boxen(summary, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
      })
    );
  });

// ─── status ──────────────────────────────────────────────────────────────────

program
  .command('status [path]')
  .description('Report the injection state of an Expo Router project')
  .action((targetPath: string | undefined) => {
    const targetDir = path.resolve(targetPath ?? '.');

    const report = getStatus(targetDir);

    console.log('');
    if (report.state === 'not-injected') {
      console.log(chalk.yellow('● not injected'));
      console.log(chalk.dim('  Run `droproute inject` to wire in attribution.'));
    } else if (report.state === 'injected') {
      console.log(chalk.green('● injected'));
      for (const f of report.files) {
        console.log(chalk.dim(`  ✓ ${f.relativePath}`));
      }
    } else {
      console.log(chalk.red('● partially modified'));
      console.log(chalk.dim('  Some injected files have been modified since injection:'));
      for (const f of report.files) {
        const icon = f.status === 'unchanged' ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${icon} ${f.relativePath} ${f.status !== 'unchanged' ? chalk.red(`(${f.status})`) : ''}`);
      }
    }
    console.log('');
  });

// ─── rollback ────────────────────────────────────────────────────────────────

program
  .command('rollback [path]')
  .description('Restore all files to their pre-injection state')
  .action((targetPath: string | undefined) => {
    const targetDir = path.resolve(targetPath ?? '.');

    if (!manifestExists(targetDir)) {
      console.error(chalk.red('\n✖  No manifest found. Has `droproute inject` been run?'));
      process.exit(1);
    }

    const spinner = ora('Rolling back injection...').start();
    let manifest;
    try {
      manifest = readManifest(targetDir);
    } catch (err: any) {
      spinner.fail('Could not read manifest');
      console.error(chalk.red(err.message));
      process.exit(1);
    }

    for (const entry of manifest.files) {
      const fullPath = path.join(targetDir, entry.relativePath);
      const dir = path.dirname(fullPath);

      if (entry.originalContent === '') {
        // File didn't exist before injection — delete it
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          // Try to remove empty parent dir (lib/droproute)
          try {
            const parent = path.dirname(fullPath);
            if (fs.existsSync(parent) && fs.readdirSync(parent).length === 0) {
              fs.rmdirSync(parent);
              const grandparent = path.dirname(parent);
              if (fs.existsSync(grandparent) && fs.readdirSync(grandparent).length === 0) {
                fs.rmdirSync(grandparent);
              }
            }
          } catch {
            // Best-effort directory cleanup
          }
        }
      } else {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, entry.originalContent, 'utf-8');
      }
    }

    deleteManifest(targetDir);
    // Remove .droproute dir if empty
    try {
      const manifestDir = path.join(targetDir, '.droproute');
      if (fs.existsSync(manifestDir) && fs.readdirSync(manifestDir).length === 0) {
        fs.rmdirSync(manifestDir);
      }
    } catch {
      // Best-effort
    }

    spinner.succeed('Rollback complete');
    console.log('');
    console.log(chalk.green('All injected files restored to pre-injection state.'));
    console.log(chalk.dim('Run `git diff` to verify the working tree is clean.'));
    console.log('');
  });

program.parse(process.argv);
