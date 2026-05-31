const printHello = () => {
	return "Hello, world!";
};

test("hello", () => {
	expect(printHello()).toBe("Hello, world!");
});
