export { checkPreconditions } from './preconditions';
export { runInjection, findRootLayout, findFirstScreen, detectExistingConditional } from './transformer';
export { writeManifest, readManifest, deleteManifest, getStatus, manifestExists } from './manifest';
export type { InjectionPlan, InjectionChange, InjectionResult, PreconditionResult } from './transformer';
export type { Manifest, ManifestEntry, StatusReport } from './manifest';
