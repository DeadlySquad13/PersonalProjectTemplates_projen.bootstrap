import fs from "fs";
import path from "path";
import { cdk, javascript } from "projen";
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
  prettier: true,
  releaseFailureIssue: true,
  // autoApproveUpgrades: true,
  // autoApproveOptions: {
  //     allowedUsernames: ["DeadlySquad13-automation"],
  // },

  deps: ["projen@0.87.4"],
  peerDeps: ["projen@0.87.4"],
  devDeps: ["@typescript-eslint/parser"],

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

const eslint = javascript.Eslint.of(project);

if (eslint) {
  // Had lint errors (couldn't find root as far as I remember).
  eslint.addExtends("eslint:recommended");
}

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
