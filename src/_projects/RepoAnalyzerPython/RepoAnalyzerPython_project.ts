import { cdk } from "projen";

/**
 * Configurable knobs for Repo Analyzer Python Project.
 */
export interface RepoAnalyzerPythonProjectOptions
	extends cdk.JsiiProjectOptions {
	/**
	 * What e-mail address to list for the Code of Conduct Point of Contact
	 *
	 * @default - `project.authorAddress`
	 */
	readonly contactEmail?: string;
}

/**
 * Repo Analyzer Python Project.
 *
 */
export class RepoAnalyzerPython extends cdk.JsiiProject {
	constructor(options: RepoAnalyzerPythonProjectOptions) {
		super({
			...options,
			readme: {
				filename: "README.md",
				contents: "# Repo Analyzer Python",
			},
			defaultReleaseBranch: "main",
			gitpod: true,
			releaseToNpm: false,
		});
	}
}
