---
name: interactive-testing
description: Test and debug so's interactive mode in a controlled tmux terminal. Use for TUI behavior checks and interactive release smoke tests.
---

# Testing so Interactive Mode with tmux

Run the TUI in a controlled terminal (from the repo root, two directories above this skill):

```bash
tmux new-session -d -s so-test -x 80 -y 24
tmux send-keys -t so-test "./so-test.sh" Enter
sleep 3 && tmux capture-pane -t so-test -p     # capture after startup
tmux send-keys -t so-test "your prompt here" Enter
tmux send-keys -t so-test Escape               # special keys (also C-o for ctrl+o, etc.)
tmux kill-session -t so-test
```

For release smoke tests, start the tmux session with `-c /tmp` and replace `./so-test.sh` with the absolute path to the release binary. Test both Node and Bun binaries separately, submit a prompt, and wait for the model reply; startup alone is not a passing smoke test.
