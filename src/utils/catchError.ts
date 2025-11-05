export async function CatchError<T>(
    promise: Promise<T>
): Promise<[T, null] | [null, Error]> {
    try {
        const data: T = await promise;
        return [data, null];
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(error);
        return [null, error];
    }
}
