import fs from "node:fs";
import path from "node:path";
import { cdk } from "projen";
import { NpmAccess } from "projen/lib/javascript";

const DOCS_ROOT = "docs";

const project = new cdk.JsiiProject({
	author: "DeadlySquad13",
	authorAddress: "46250621+DeadlySquad13@users.noreply.github.com",
	npmAccess: NpmAccess.PUBLIC,
	name: "@dsomega-boostrap/projen",
	packageName: "@dsomega-boostrap/projen" /* The "name" in package.json. */,
	repositoryUrl:
		"https://github.com/DeadlySquad13/PersonalProjectTemplates_projen.bootstrap",
	description:
		"Projen project types for easy project bootstrapping" /* The description is just a string that helps people understand the purpose of the package. */,
	keywords: [
		// Directly related.
		"python",
		"projen",
		"project",
		"template",
		// Child of.
		"sdk",
		"constructs",
	],

	defaultReleaseBranch: "main",
	projenrcTs: true,
	gitpod: true,
	devContainer: true,
	codeCov: true,
	prettier: false,
	eslint: false,
	biome: true,
	releaseFailureIssue: true,
	// autoApproveUpgrades: true,
	// autoApproveOptions: {
	//     allowedUsernames: ["DeadlySquad13-automation"],
	// },

	deps: [],
	bundledDeps: ["dedent@1.7.2"],
	peerDeps: ["projen@^0.99", "constructs@^10.0.0"],
	peerDependencyOptions: {
		// INFO: `NodeProject` always adds `constructs@^10.0.0` as a BUILD (dev) dep.
		// This means the pinned mechanism's skip condition (`hasRuntime && !hasBuild`) can never fire for `constructs`,
		// so it always adds a pinned version (`10.0.0`), which collides with the resolved `10.3.0`.
		pinnedDevDependency: false,
	},
	devDeps: ["@types/dedent@0.7.2"],

	gitignore: [
		".pnp.*",
		".yarn/*",
		"!.yarn/patches",
		"!.yarn/plugins",
		"!.yarn/releases",
		"!.yarn/sdks",
		"!.yarn/versions",
	],

	docsDirectory: DOCS_ROOT,
	docgenFilePath: `${DOCS_ROOT}/API.md`,
});

project.docsDirectory;
const mkdir = (relativePath: string) => {
	const directory = path.join(__dirname, relativePath);

	if (fs.existsSync(directory)) {
		return;
	}

	fs.mkdir(directory, (err) => {
		if (err) {
			return console.error(err);
		}
		console.log(`Directory '${directory}' created successfully!`);
	});
};

mkdir(project.docsDirectory);

project.synth();
