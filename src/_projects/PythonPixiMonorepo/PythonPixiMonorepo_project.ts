import dedent from "dedent";
import { identity, pipe } from "fp-ts/lib/function";
import * as R from "fp-ts/Record";
import {
	Component,
	cdk,
	IniFile,
	SampleDir,
	TextFile,
	TomlFile,
	// YamlFile,
} from "projen";
import type { NodeProject } from "projen/lib/javascript";
import { installRequiresToPixiDeps } from "../../_lib/Pixi/pixi.utils";
import { pythonGitignore } from "../../_lib/Python/gitignore";

/**
 * Shared optional fields for a Pixi package.
 */
export interface PixiPackageProps {
	/**
	 * Python package name (e.g., "dsomega_logging"). Defaults to name with dashes replaced by underscores and `dsomega_` prefix.
	 */
	readonly pythonPackage?: string;

	/**
	 * Package description.
	 */
	readonly description?: string;

	/**
	 * Additional Python dependencies (for setup.cfg install_requires).
	 */
	readonly installRequires?: string[];

	/**
	 * Additional content to generate in the src/ directory.
	 */
	readonly sampleSrcFiles?: Record<string, string>;
}

/**
 * Options for a Pixi package.
 */
export interface PixiPackageOptions extends PixiPackageProps {
	/**
	 * Name of the package (used for directory name and Python package name).
	 */
	readonly name: string;
}

export interface TaskOptions {
	/**
	 * @default true
	 */
	readonly includeRunMainTask?: boolean;
}

export interface AddPackageTaskOptions {
	/**
	 * name, task defition
	 */
	readonly tasks?: Record<string, string>;
	readonly taskOptions?: TaskOptions;
}

/**
 * Options for adding a package to the monorepo.
 */
export interface AddPackageOptions
	extends PixiPackageProps,
		AddPackageTaskOptions {}

/**
 * A component that generates files for a single Pixi package.
 */
export class PixiPackage extends Component {
	public readonly packageName: string;
	public readonly pythonPackage: string;

	/**
	 * @param packageName - name of the package inside `packages/*`.
	 * @returns Name of the monorepo package that will be actually installed as
	 * editable python package.
	 */
	getPythonMonorepoPackageName(packageName: string) {
		return `dsomega_${packageName.replace(/-/g, "_")}`;
	}

	constructor(project: NodeProject, options: PixiPackageOptions) {
		super(project);

		this.packageName = options.name;
		this.pythonPackage =
			options.pythonPackage ??
			this.getPythonMonorepoPackageName(this.packageName);

		const pkgPath = `packages/${this.packageName}`;

		// .envrc
		new TextFile(project, `${pkgPath}/.envrc`, {
			lines: [
				"watch_file ../../pixi.lock",
				"",
				`PIXI_ENV="\${PIXI_ENV:-${this.pythonPackage}}"`,
				"",
				"source_env_if_exists .envrc.local",
				"",
				'echo "Activating package pixi environment: $PIXI_ENV"',
				'eval "$(pixi shell-hook --environment "$PIXI_ENV" --manifest-path ../.. --frozen)"',
			],
		});

		// pixi.toml
		new TomlFile(project, `${pkgPath}/pixi.toml`, {
			obj: {
				workspace: {
					channels: ["conda-forge"],
					platforms: ["linux-64", "osx-64", "osx-arm64", "win-64"],
					preview: ["pixi-build"],
				},
				package: {
					name: this.pythonPackage,
					version: "0.1.0",

					build: {
						backend: { name: "pixi-build-python", version: "0.*" },
					},

					"host-dependencies": {
						setuptools: ">=70.0.0",
					},
				},
			},
		});

		// pyproject.toml
		new TomlFile(project, `${pkgPath}/pyproject.toml`, {
			obj: {
				"build-system": {
					requires: ["setuptools>=70.0.0", "wheel"],
					"build-backend": "setuptools.build_meta",
				},
			},
		});

		// setup.cfg
		const setupCfg = new IniFile(project, `${pkgPath}/setup.cfg`, {
			obj: {
				metadata: {
					name: this.pythonPackage,
					description: options.description ?? `${this.packageName} package`,
					version: "0.1.0",
					author: "DeadlySquad13",
					license: "MIT",
					// license_file: "LICENSE",
					platforms: "unix, linux, osx, cygwin, win32",
					classifiers: ["Programming Language :: Python :: 3.14.0"],
				},
				options: {
					packages: "find:",
					install_requires: options.installRequires,
					python_requires: [">=3.14"],
					package_dir: ["=src"],
					zip_safe: "no",
					package_data: {
						find: "py.typed",
					},
				},
				flake8: {
					"max-line-length": "100",
				},

				"build-system": {
					requires: ["setuptools"],
					"build-backend": "setuptools.build_meta",
				},
			},
		});

		// biome-ignore lint/suspicious/noExplicitAny: ini issue, see [1], [2], [3].
		const origSynth = (setupCfg as any).synthesizeContent.bind(setupCfg);
		// biome-ignore lint/suspicious/noExplicitAny: ini issue, see [1], [2], [3].
		(setupCfg as any).synthesizeContent = (resolver: any) => {
			const content = origSynth(resolver);
			if (content === undefined) return undefined;

			return dedent`
				${content}
				[options.packages.find]
				where = src
			`;
		};

		// Sample source files (customizable)
		const srcFiles = options.sampleSrcFiles ?? {
			"__init__.py": "",
			"main.py": `def hello():\n    return "Hello from ${this.packageName}"\n`,
		};
		new SampleDir(project, `${pkgPath}/src/${this.pythonPackage}`, {
			files: srcFiles,
		});

		// Tests
		new SampleDir(project, `${pkgPath}/tests`, {
			files: {
				"__init__.py": "",
				"test_main.py": `from ${this.pythonPackage}.main import hello\n\ndef test_hello():\n    assert hello() == "Hello from ${this.packageName}"\n`,
			},
		});

		// .gitignore for package
		new TextFile(project, `${pkgPath}/.gitignore`, {
			lines: ["__pycache__/", "*.pyc", ".envrc.local"],
		});
	}
}

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
	private readonly rootPixiToml: TomlFile;
	// private rootPixiObj: any;
	// private rootPixiToml: TomlFile;

	constructor(options: PythonPixiMonorepoProjectOptions) {
		super({
			...options,
			gitignore: [...pythonGitignore, ...(options.gitignore || [])],
			readme: { filename: "README.md", contents: "# Python Monorepo" },
			defaultReleaseBranch: "main",
			gitpod: true,
			releaseToNpm: false,
		});

		// Root configuration files using proper primitives
		new IniFile(this, ".editorconfig", {
			obj: {
				root: true,
				"*": {
					end_of_line: "lf",
					insert_final_newline: true,
					charset: "utf-8",
					indent_style: "space",
					indent_size: 2,
				},
			},
		});

		// TODO: Conflicts with already existing `.gitlab-ci.yml` that is
		// passed by default.
		// new YamlFile(this, ".gitlab-ci.yml", {
		// 	obj: {
		// 		stages: ["test", "build"],
		// 		test: { stage: "test", script: ["pixi run test"] },
		// 	},
		// });

		// new YamlFile(this, ".pre-commit-config.yaml", {
		// 	obj: {
		// 		repos: [
		// 			{
		// 				repo: "https://github.com/pre-commit/pre-commit-hooks",
		// 				rev: "v4.5.0",
		// 				hooks: [{ id: "trailing-whitespace" }, { id: "end-of-file-fixer" }],
		// 			},
		// 		],
		// 	},
		// });

		new IniFile(this, "mypy.ini", {
			obj: {
				mypy: {
					python_version: "3.14",
					warn_return_any: true,
					warn_unused_configs: true,
				},
			},
		});

		new IniFile(this, "pytest.ini", {
			obj: {
				pytest: {
					testpaths: "packages/*/tests",
					python_files: "test_*.py",
					python_classes: "Test*",
					python_functions: "test_*",
				},
			},
		});

		// Root pixi.toml (workspace)
		this.rootPixiToml = new TomlFile(this, "pixi.toml", {
			obj: {
				workspace: {
					// channels: ["pytorch", "nvidia", "conda-forge"],
					version: "0.1.0",
					channels: ["conda-forge"],
					platforms: ["linux-64", "osx-64", "osx-arm64", "win-64"],
					authors: [
						"DeadlySquad13 <46250621+DeadlySquad13@users.noreply.github.com>",
					],
				},
				feature: {
					test: {
						tasks: { test: "pytest --rootdir=$PACKAGE_DIR" },
						"pypi-dependencies": { pytest: ">=7.0.0,<9" },
					},
					lint: {
						tasks: {
							"lint-check": "flake8 src",

							format: "black src",
							"format-check": "black --check --diff src",

							"types-check": "mypy src",

							"order-imports": "isort src",
							"order-imports-check": "isort --check --diff src",
						},
					},
					"pre-commit": {
						tasks: { "pre-commit-check": "pre-commit run --all-files" },
						// QUESTION: For some reason commented in Pythno_lib
						// pypi-dependencies = { Python_lib = { path = "./", editable = true }, pre-commit = "==3.7.0" }
					},
				},

				dependencies: {
					python: "3.14.*",
				},
				environments: {},
			},
		});

		// Other root files
		new TextFile(this, ".env.dev.example", {
			lines: ["# Development environment variables", "FOO=bar"],
		});

		new TextFile(this, ".envrc", {
			lines: [
				"watch_file pixi.lock",
				"",
				// biome-ignore lint/suspicious/noTemplateCurlyInString: It's a template string inside template.
				'PIXI_ENV="${PIXI_ENV:-default}"',
				"",
				"source_env_if_exists .envrc.local",
				"",
				'echo "Activating workspace pixi environment: $PIXI_ENV"',
				'eval "$(pixi shell-hook --environment "$PIXI_ENV" --frozen)"',
			],
		});

		// TODO: Conflicts with already existing `.gitattributes`.
		// new TextFile(this, ".gitattributes", {
		// 	lines: ["* text=auto", "*.lock binary"],
		// });

		new TextFile(this, ".nvim.lua", {
			lines: [
				"-- Neovim configuration for this project",
				"vim.opt.expandtab = true",
			],
		});

		new TextFile(this, "CONTRIBUTING.md", {
			lines: ["# Contributing", "Guidelines coming soon."],
		});

		new TextFile(this, "Dockerfile", {
			lines: [
				"FROM ghcr.io/prefix-dev/pixi:latest",
				"WORKDIR /app",
				"COPY . .",
				"RUN pixi install",
			],
		});

		new TextFile(this, "Dockerfile.ci", {
			lines: [
				"FROM ghcr.io/prefix-dev/pixi:latest",
				"WORKDIR /app",
				"COPY . .",
				"RUN pixi install && pixi run lint && pixi run test",
			],
		});

		new TextFile(this, "Makefile", {
			lines: [
				".PHONY: help install test lint",
				"help:",
				'\t@echo "Available commands:"',
				'\t@echo "  make install   - Install dependencies with pixi"',
				'\t@echo "  make test      - Run tests"',
				'\t@echo "  make lint      - Run linters"',
				"install:",
				"\tpixi install",
				"test:",
				"\tpixi run test",
				"lint:",
				"\tpixi run lint",
			],
		});

		new TextFile(this, "Makefile.pkg", {
			lines: ["# Additional package-specific make targets"],
		});

		new TextFile(this, "docs/.gitignore", {
			lines: ["_build/", "*.pyc"],
		});

		new TextFile(this, "make.bat", {
			lines: ["@echo off", "pixi run %*"],
		});

		// Create an initial example package
		this.addPackage("common", {
			description: "Common utilities",
			// installRequires: ["tqdm>=4.67.3,<5"],
			sampleSrcFiles: {
				"__init__.py": "",
				"main.py": `import logging\nfrom rich.logging import RichHandler\n\ndef hello_world():\n    logging.basicConfig(level=logging.INFO, handlers=[RichHandler()])\n    logging.info("Hello from common")\n    return "Hello World!"\n`,
			},
		});

		// Add a task to add new packages
		this.addTask("add-package", {
			description: "Add a new Python package to the monorepo",
			exec: "node scripts/add-package.js",
			receiveArgs: true,
		});

		// TODO:
		// Create the script file
		new TextFile(this, "scripts/add-package.js", {
			lines: [
				"#!/usr/bin/env node",
				"const { PythonPixiMonorepo } = require('../lib');",
				"// This is a placeholder; actual implementation would need to",
				"// instantiate the project and call addPackage() with process.argv",
				'console.log("Add package:", process.argv.slice(2).join(" "));',
			],
			executable: true,
		});
	}

	/**
	 * Add a new package to the monorepo and update the root pixi.toml.
	 */
	public addPackage(name: string, options?: AddPackageOptions): PixiPackage {
		const pkg = new PixiPackage(this, {
			name,
			pythonPackage: options?.pythonPackage,
			description: options?.description,
			installRequires: options?.installRequires,
			sampleSrcFiles: options?.sampleSrcFiles,
		});

		this.updateRootPixiForPackage(pkg.packageName, pkg.pythonPackage, options);

		return pkg;
	}

	/**
	 * Override pixi.toml with tasks for package.
	 *
	 * For package `artifact-aggregator` will add:
	 * ```toml
	 * [feature.artifact-aggregator.tasks]
	 * run-artifact-aggregator = "python -m dsomega_artifact_aggregator.main"
	 * ```
	 * if:
	 * - `featureName = 'artifact-aggregator'`
	 * - `pythonMonoperoPackageName = 'dsomega_artifact_aggregator'`
	 * - and no `tasks` or `taskOptions` are provided.
	 */
	protected addTasks(
		featureName: string,
		pythonMonoperoPackageName: string,
		{ tasks, taskOptions }: AddPackageTaskOptions,
	) {
		const includeRunMainTask = taskOptions?.includeRunMainTask ?? true;

		const runMain = `python -m ${pythonMonoperoPackageName}.main`;

		const packageTasks = pipe(
			{},
			includeRunMainTask ? R.upsertAt(`run-${featureName}`, runMain) : identity,
			tasks && !R.isEmpty(tasks)
				? (current) => ({ ...current, ...tasks })
				: identity,
		);
		if (R.size(packageTasks)) {
			this.rootPixiToml.addOverride(
				`feature.${featureName}.tasks`,
				packageTasks,
			);
		}
	}

	/**
	 * Adds to root pixi.toml:
	 * ```toml
	 *   [feature.<packageDirName>.pypi-dependencies]
	 *   <pythonPackageName> = { path = "./packages/<packageDirName>", editable = true }
	 *
	 *   [feature.<packageDirName>.activation.env]
	 *   PACKAGE_DIR = "packages/<packageDirName>"
	 *
	 *   [environments.<packageDirName>]
	 *   features = ["<packageDirName>"]
	 *   solve-group = "<packageDirName>"
	 *
	 *   [environments.<packageDirName>-dev]
	 *   features = ["<packageDirName>", "test", "lint", "pre-commit"]
	 *   solve-group = "<packageDirName>"
	 * ```
	 * @param packageDirName - name of the package inside `packages/*`.
	 * @param pythonMonoperoPackageName - Name of the monorepo package that will be actually installed as
	 * editable python package. Should be different from packageDirName
	 * (otherwise pixi and python would throw ModuleNotFound because packages
	 * are confused between each other).
	 */
	private updateRootPixiForPackage(
		packageDirName: string,
		pythonMonoperoPackageName: string,
		{ installRequires, tasks, taskOptions }: AddPackageOptions = {},
	) {
		if (packageDirName === pythonMonoperoPackageName) {
			throw new Error(
				`Parameters 'packageDirName' and 'pythonMonoperoPackageName' should be different (otherwise pixi and python would throw ModuleNotFound because packages are confused between each other)`,
			);
		}

		const featureName = packageDirName;

		if (installRequires) {
			this.rootPixiToml.addOverride(
				`feature.${featureName}.dependencies`,
				installRequiresToPixiDeps(installRequires),
			);
		}

		this.rootPixiToml.addOverride(`feature.${featureName}.pypi-dependencies`, {
			[pythonMonoperoPackageName]: {
				path: `./packages/${packageDirName}`,
				editable: true,
			},
		});

		this.rootPixiToml.addOverride(
			`feature.${featureName}.activation.env.PACKAGE_DIR`,
			`packages/${packageDirName}`,
		);

		this.addTasks(featureName, pythonMonoperoPackageName, {
			tasks,
			taskOptions,
		});

		this.rootPixiToml.addOverride(`environments.${packageDirName}`, {
			features: [featureName],
			"solve-group": featureName,
		});

		this.rootPixiToml.addOverride(`environments.${packageDirName}-dev`, {
			features: [featureName, "test", "lint", "pre-commit"],
			"solve-group": featureName,
		});
	}
}

/**
 * References:
 * [1]: <https://github.com/projen/projen/issues/2749> 'Ini npm package github issue about escaping dots in Projen'
 * [2]: <https://github.com/npm/ini/issues/30> 'Ini npm package github issue about slashes'
 * [3]: <logseq://graph/Notes?block-id=6a37d961-3dfe-4ae9-aacb-eabe4586fc3a> 'Explanation about conflicting keys in setuptools'
 */
