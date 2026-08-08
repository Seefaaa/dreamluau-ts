import * as SS13 from "SS13";
import { to_chat } from "@scripts/common/globals";

// A script has no `main()`. The file body runs top to bottom when the server executes the compiled Lua, and
// whatever it registers — signals, timers, loops — is what keeps it alive afterwards.

const runner = SS13.get_runner_client();

if (SS13.is_valid(runner)) {
    to_chat(runner, "<span class='notice'>Hello from the template script.</span>");
}
