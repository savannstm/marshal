# FAQ

**Do you support [Stream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) API?**

Because the stream API in the browser and in node.js is not similar at all, it should be separated into 2 files and add `exports` respectively. I'm not in a hurry to implement this feature. If you really need this please make a pr/issue to let me know.

**Do you support [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)?**

Heck yeah, BigInt is supported. It's serialized to JSON as `{ __type: "bigint", value: "..." }` object.

**Do you support ...?**

Feel free to open an issue, contact me directly or submit a pr to improve this library.
