const deepCopy = (target: any): Object => {
	// Store the cloned value.
	let result: any;
	// Deep-copy objects and arrays.
	if (typeof target === 'object' && target !== null) {
		// Clone arrays item by item.
		if (Array.isArray(target)) {
			result = []; // Initialize the cloned array.
			for (let i in target) {
				// Recursively clone each item.
				result.push(deepCopy(target[i]));
			}
		} else {
			// Recursively clone each property of a plain object.
			result = {};
			for (let i in target) {
				result[i] = deepCopy(target[i]);
			}
		}
		// Primitive values can be assigned directly.
	} else {
		result = target;
	}
	// Return the cloned value.
	return result;
};

export const clone = (target: any) => {
	let result;
	try {
		result = deepCopy(target);
	} catch (e) {
		result = JSON.parse(JSON.stringify(target));
	}
	return result;
};

/**
 * Clone through JSON serialization.
*/
export const cloneByJSON = <T>(sourceObj: T): T => JSON.parse(JSON.stringify(sourceObj));
