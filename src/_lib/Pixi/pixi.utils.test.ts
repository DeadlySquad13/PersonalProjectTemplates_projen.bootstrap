import { installRequiresToPixiDeps } from "./pixi.utils";

describe("installRequiresToPixiDeps", () => {
	test.each([
		[["pyperclip==1.11.0"], { pyperclip: "==1.11.0" }],
	])("parses and converts == dependencies", (installRequires, pixiDependencies) => {
		expect(installRequiresToPixiDeps(installRequires)).toEqual(
			pixiDependencies,
		);
	});
});
