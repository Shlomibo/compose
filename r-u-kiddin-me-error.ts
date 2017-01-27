
export class RKDMError extends Error {
	constructor(message?: string) {
		const ERR = 'Cannot mutate object';
		super(
			message == null
				? ERR
				: `${ ERR }: message`
		);
	}
}
export default RKDMError;
