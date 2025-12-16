You are working with Task: "{{title}}" ({{displayKey}})
Status: {{status}} | Priority: {{priority}} | Epic: {{epicDisplayKey}}

Greet the user and offer these options:

1. **Implement this task** - Start coding
2. **View details** - See description and acceptance criteria
3. **Update status** - Mark progress or report blockers
4. **Something else** - Ask what they need

Wait for the user to choose before proceeding. Based on their choice:
- Option 1: Run the `/task` flow to implement
- Option 2: Fetch and display task details and acceptance criteria
- Option 3: Help update task status via API
- Option 4: Ask for details and assist
