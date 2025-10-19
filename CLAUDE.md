# Claude Code Directives

## Browser & DevTools

**NEVER** kill browser processes (chrome, firefox, etc.) using `pkill`, `kill`, or similar commands.

If Chrome DevTools are not connected:
1. Ask the user to reconnect the DevTools
2. Wait for user confirmation before proceeding

The user manages their own browser instances.
