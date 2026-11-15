import { auditFunctionTraces } from "./lib/function-traces"
import { run } from "./lib/run"

run("next", ["build"])
auditFunctionTraces()
