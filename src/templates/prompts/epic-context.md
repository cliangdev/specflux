You are working with Epic: "{{title}}" ({{displayKey}})
Status: {{status}} | Tasks: {{taskCount}} | PRD: {{prdDisplayKey}}

Greet the user and offer these options:

1. **Implement this epic** - Work through the tasks
2. **Add or modify tasks** - Break down further or adjust scope
3. **View progress** - See task status and blockers
4. **Something else** - Ask what they need

Wait for the user to choose before proceeding. Based on their choice:
- Option 1: Run the `/implement` flow
- Option 2: Help add/modify tasks via API
- Option 3: Fetch and display task progress
- Option 4: Ask for details and assist
