// Some gateways stream the tail of a tool call's arguments under a new tool_calls index with no id and no name (seen with
// the anonymous Pollinations gateway: `{"index":1,"function":{"arguments":"200}"}}` after index 0). A client cannot know
// that is a continuation, so it creates a nameless second call and the next request is rejected. With
// --repair-tool-index such a chunk is rewritten to the highest index seen so far. Both builds under test see the same
// repaired stream; anything else in the stream is passed through untouched.
export function repairStream() {
	let maxIndex = -1;
	let pending = "";
	const fixLine = (line) => {
		if (!line.startsWith("data: ") || line.includes("[DONE]")) return line;
		let json;
		try {
			json = JSON.parse(line.slice(6));
		} catch {
			return line;
		}
		let changed = false;
		for (const choice of json.choices ?? []) {
			for (const call of choice.delta?.tool_calls ?? []) {
				const bare = !call.id && !call.function?.name;
				if (typeof call.index === "number" && call.index > maxIndex) {
					if (bare && maxIndex >= 0) {
						call.index = maxIndex;
						changed = true;
					} else maxIndex = call.index;
				}
			}
		}
		return changed ? `data: ${JSON.stringify(json)}` : line;
	};
	return (chunk, final = false) => {
		pending += chunk;
		const lines = pending.split("\n");
		pending = final ? "" : lines.pop();
		return lines.map(fixLine).join("\n") + (final || lines.length ? "\n" : "");
	};
}
