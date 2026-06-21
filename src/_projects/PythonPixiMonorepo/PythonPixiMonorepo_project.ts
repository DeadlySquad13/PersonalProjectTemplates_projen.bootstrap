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

/**
 * Shared optional fields for a Pixi package.
 */
export interface PixiPackageProps {
	/**
	 * Python package name (e.g., "dsomega_logging"). Defaults to name with dashes replaced by underscores.
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

/**
 * Options for adding a package to the monorepo.
 */
export interface AddPackageOptions extends PixiPackageProps {}

/**
 * A component that generates files for a single Pixi package.
 */
export class PixiPackage extends Component {
	public readonly packageName: string;
	public readonly pythonPackage: string;

	constructor(project: NodeProject, options: PixiPackageOptions) {
		super(project);

		this.packageName = options.name;
		this.pythonPackage =
			options.pythonPackage ?? this.packageName.replace(/-/g, "_");

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
				},
				"package.build": {
					backend: { name: "pixi-build-python", version: "0.*" },
				},
				"package.host-dependencies": {
					setuptools: ">=70.0.0",
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
		new IniFile(project, `${pkgPath}/setup.cfg`, {
			obj: {
				metadata: {
					name: this.pythonPackage,
					description: options.description ?? `${this.packageName} package`,
					version: "0.1.0",
					author: "DeadlySquad13",
					license: "MIT",
					license_file: "LICENSE",
					platforms: "unix, linux, osx, cygwin, win32",
					classifiers: ["Programming Language :: Python :: 3.14.0"],
				},
				options: {
					packages: "find:",
					install_requires: (options.installRequires ?? []).join("\n"),
					python_requires: ">=3.14",
					package_dir: "=src",
					zip_safe: "no",
				},
				"options.packages.find": {
					where: "src",
				},
				"options.package_data": {
					find: "py.typed",
				},
				flake8: {
					"max-line-length": "100",
				},
			},
		});

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
					channels: ["conda-forge"],
					platforms: ["linux-64", "osx-64", "osx-arm64", "win-64"],
					preview: ["pixi-build"],
				},
				"workspace.package": {
					authors: ["DeadlySquad13"],
					license: "MIT",
				},
				"workspace.tasks": {
					test: "pytest",
					lint: "pre-commit run --all-files",
				},
				"workspace.dependencies": {
					python: "3.14.*",
					pytest: ">=7.0.0,<9",
				},
				feature: {},
				environment: {},
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
			installRequires: ["tqdm>=4.67.3,<5"],
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

		this.updateRootPixiForPackage(pkg.packageName, pkg.pythonPackage);

		return pkg;
	}

	/**
	 *
	 * Adds to root pixi.toml:
	 * ```toml
	 *   [feature.<packageDirName>.pypi-dependencies]
	 *   <pythonPackageName> = { path = "./packages/<packageDirName>", editable = true }
	 *
	 *   [feature.<packageDirName>.activation.env]
	 *   PACKAGE_DIR = "packages/<packageDirName>"
	 *
	 *   [environment.<packageDirName>]
	 *   features = ["<packageDirName>"]
	 *   solve-group = "<packageDirName>"
	 *
	 *   [environment.<packageDirName>-dev]
	 *   features = ["<packageDirName>", "test", "lint", "pre-commit"]
	 *   solve-group = "<packageDirName>"
	 * ```
	 */
	private updateRootPixiForPackage(
		packageDirName: string,
		pythonPackageName: string,
	) {
		const featureName = packageDirName;

		this.rootPixiToml.addOverride(
			`feature.${featureName}.pypi-dependencies.${pythonPackageName}`,
			{
				path: `./packages/${packageDirName}`,
				editable: true,
			},
		);

		this.rootPixiToml.addOverride(
			`feature.${featureName}.activation.env.PACKAGE_DIR`,
			`packages/${packageDirName}`,
		);

		this.rootPixiToml.addOverride(`environment.${packageDirName}`, {
			features: [featureName],
			"solve-group": featureName,
		});

		this.rootPixiToml.addOverride(`environment.${packageDirName}-dev`, {
			features: [featureName, "test", "lint", "pre-commit"],
			"solve-group": featureName,
		});
	}
}
