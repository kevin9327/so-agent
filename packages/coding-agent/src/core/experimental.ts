export function areExperimentalFeaturesEnabled(): boolean {
	return process.env.SO_EXPERIMENTAL === "1";
}
