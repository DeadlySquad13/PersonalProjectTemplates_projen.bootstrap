export interface IPythonDependency {
	name: string;
	versionRange: string;
}

export function parseInstallRequiresDependency(
	dependency: string,
): IPythonDependency {
	const match = dependency.match(
		/^([\w.-]+)\s*((?:>=|<=|!=|==|~=|>|<|=)\s*[\w.*,]+)$/,
	);
	if (!match) {
		throw new Error(
			`Cannot parse dependency: "${dependency}". Expected format: "name operator version"`,
		);
	}
	return { name: match[1], versionRange: match[2] };
}
