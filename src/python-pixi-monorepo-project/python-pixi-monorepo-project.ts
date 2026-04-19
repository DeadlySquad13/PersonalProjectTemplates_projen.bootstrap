import { cdk } from "projen";

/**
 * Configurable knobs for Python Pixi Monorepo Project.
 */
export interface PythonPixiMonorepoProjectOptions
  extends cdk.JsiiProjectOptions {
  /**
   * What e-mail address to list for the Code of Conduct Point of Contact
   *
   * @default - `project.authorAddress`
   */
  readonly contactEmail?: string;
}

/**
 * Python Pixi Monorepo Project
 *
 */
export class PythonPixiMonorepo extends cdk.JsiiProject {
  constructor(options: PythonPixiMonorepoProjectOptions) {
    super({
      ...options,
      readme: {
        filename: "README.md",
        contents: "# Python Monorepo",
      },
      defaultReleaseBranch: "main",
      gitpod: true,
      releaseToNpm: false,
    });
  }
}
