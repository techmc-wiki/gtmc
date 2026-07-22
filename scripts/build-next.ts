import { run } from "./lib/run"
import { auditFunctionTraces } from "./lib/function-traces"

run("next", ["build"])
auditFunctionTraces()
