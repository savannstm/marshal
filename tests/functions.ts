export function getLineNumber() {
    const error = new Error();
    const stackLines = (error.stack as string).split("\n");
    const callerLine = stackLines[2];

    const lineNumber = callerLine.match(/:(\d+):\d+\)$/)?.[1];
    return lineNumber;
}
