import { diffWords } from "diff"
const current = "Hello world\r\nThis is a test"
const incoming = "Hello world\nThis is a test with difference"
const diffs = diffWords(incoming, current)
console.log(diffs)
