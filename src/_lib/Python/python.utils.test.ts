import { parseInstallRequiresDependency } from "./python.utils";

describe("parseInstallRequiresDependency", () => {
	test.each([
		[
			"pyperclip==1.11.0",
			{
				name: "pyperclip",
				versionRange: "==1.11.0",
			},
		],
		[
			"pyperclip11==1.13.0",
			{
				name: "pyperclip11",
				versionRange: "==1.13.0",
			},
		],
		[
			"kkk==0.x.*",
			{
				name: "kkk",
				versionRange: "==0.x.*",
			},
		],
	])("parses == dependencies", (dependency, dependencyIntermediateReperesentation) => {
		expect(parseInstallRequiresDependency(dependency)).toEqual(
			dependencyIntermediateReperesentation,
		);
	});

	test.each([
		[
			"pyperclip<=1.11.0",
			{
				name: "pyperclip",
				versionRange: "<=1.11.0",
			},
		],
		[
			"pyperclip11<=1.13.0",
			{
				name: "pyperclip11",
				versionRange: "<=1.13.0",
			},
		],
		[
			"kkk<=0.x.*",
			{
				name: "kkk",
				versionRange: "<=0.x.*",
			},
		],
	])("parses <= dependencies", (dependency, dependencyIntermediateReperesentation) => {
		expect(parseInstallRequiresDependency(dependency)).toEqual(
			dependencyIntermediateReperesentation,
		);
	});

	test.each([
		[
			"pyperclip>=1.11.0",
			{
				name: "pyperclip",
				versionRange: ">=1.11.0",
			},
		],
		[
			"pyperclip11>=1.13.0",
			{
				name: "pyperclip11",
				versionRange: ">=1.13.0",
			},
		],
		[
			"kkk>=0.x.*",
			{
				name: "kkk",
				versionRange: ">=0.x.*",
			},
		],
	])("parses >= dependencies", (dependency, dependencyIntermediateReperesentation) => {
		expect(parseInstallRequiresDependency(dependency)).toEqual(
			dependencyIntermediateReperesentation,
		);
	});
});
