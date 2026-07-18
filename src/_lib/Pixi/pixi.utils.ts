import * as A from "fp-ts/lib/Array.js";
import { flow, pipe } from "fp-ts/lib/function.js";
import type { IPythonDependency } from "../Python/python.utils";
import { parseInstallRequiresDependency } from "../Python/python.utils";

export function toPixiDeps(
	dependencies: IPythonDependency[],
): Record<string, string> {
	return pipe(
		dependencies,
		A.reduce({} as Record<string, string>, (acc, dep) => {
			acc[dep.name] = dep.versionRange;
			return acc;
		}),
	);
}

export function installRequiresToPixiDeps(
	dependencies: string[],
): Record<string, string> {
	return flow(A.map(parseInstallRequiresDependency), toPixiDeps)(dependencies);
}
