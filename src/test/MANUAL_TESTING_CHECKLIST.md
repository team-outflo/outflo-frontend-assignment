# Manual UI Testing Checklist

This checklist covers manual testing for UI changes introduced in the current branch compared to main. Tests are prioritized by risk level.

## Pre-Test Setup

- [ ] Ensure backend is running and accessible
- [ ] Clear browser cache and local storage
- [ ] Have test campaign data available (with CSV leads)
- [ ] Have at least one active LinkedIn sender account

---

## 🔴 CRITICAL (Release Blockers)

### Campaign Editor - Basic Functionality
- [ ] **CR-001**: Open existing campaign in edit mode - verify no errors on load
- [ ] **CR-002**: All messages display correctly with existing variables (no blank content)
- [ ] **CR-003**: Variable chips render properly in message editors (colored, clickable)
- [ ] **CR-004**: Edit a follow-up message - verify content saves on blur/navigation
- [ ] **CR-005**: Save campaign and reload - verify no data loss

### Campaign Launch
- [ ] **CR-006**: Navigate to Review & Launch with properly configured campaign
- [ ] **CR-007**: Verify confirmation checkbox can be checked
- [ ] **CR-008**: Click Launch - verify campaign status changes to RUNNING
- [ ] **CR-009**: View running campaign - verify all data intact

### Variable Configuration
- [ ] **CR-010**: Click CSV variable chip - config modal opens
- [ ] **CR-011**: Configure fallback (insertDefaultValue) - save and verify persists
- [ ] **CR-012**: Click LinkedIn variable chip - config modal opens
- [ ] **CR-013**: Configure LinkedIn fallback - save and verify persists

---

## 🟠 HIGH PRIORITY

### New LinkedInMessageEditor
- [ ] **HP-001**: Type text in follow-up message editor - verify real-time update
- [ ] **HP-002**: Type `{` character - verify variable dropdown opens
- [ ] **HP-003**: Filter variables by typing after `{`
- [ ] **HP-004**: Select variable from dropdown - verify chip inserted
- [ ] **HP-005**: Press Escape in dropdown - verify dropdown closes, `{` removed
- [ ] **HP-006**: Click variable chip - verify click handler fires (modal opens)

### Copy Message Feature
- [ ] **HP-007**: Locate copy button next to attachment button in FollowUpStep
- [ ] **HP-008**: Click copy button - verify "Copied!" toast appears
- [ ] **HP-009**: Paste elsewhere - verify message content was copied
- [ ] **HP-010**: Copy button hidden in view mode

### Variable Dropdown (New Editor)
- [ ] **HP-011**: Variables grouped by category (CSV, LinkedIn, Sender)
- [ ] **HP-012**: Category headers show correct labels
- [ ] **HP-013**: Hover variable - verify tooltip shows description
- [ ] **HP-014**: Click "Add" to create new variable - dialog opens

### FallbackConfiguration Component
- [ ] **HP-015**: Open config for CSV variable with missing data - verify options displayed
- [ ] **HP-016**: Select "Use a fallback value" - input field enabled
- [ ] **HP-017**: Type value and save - verify configuration applied
- [ ] **HP-018**: For "all leads present" scenario - verify green banner shows
- [ ] **HP-019**: Select "Fetch from LinkedIn" (custom mode) - field dropdown appears
- [ ] **HP-020**: Select LinkedIn field - nested fallback section appears

### ReviewLaunch Validation
- [ ] **HP-021**: Create campaign with unconfigured CSV variable
- [ ] **HP-022**: Navigate to Review & Launch - verify warning alert shows
- [ ] **HP-023**: Verify specific variable names listed in warning
- [ ] **HP-024**: Confirmation checkbox disabled when validation fails
- [ ] **HP-025**: Launch button shows "Configure Variables" text
- [ ] **HP-026**: Configure all variables - warning clears, launch enabled

---

## 🟡 MEDIUM PRIORITY

### CampaignsList Table
- [ ] **MP-001**: Verify columns: Name, Status, LEADS, SENT, MESSAGES, REPLIES, Created, Actions
- [ ] **MP-002**: Hover LEADS column header - tooltip shows explanation
- [ ] **MP-003**: Hover SENT column header - tooltip shows explanation
- [ ] **MP-004**: Hover MESSAGES column header - tooltip shows explanation
- [ ] **MP-005**: Hover REPLIES column header - tooltip shows explanation
- [ ] **MP-006**: Verify Reply icon is green (not orange)
- [ ] **MP-007**: MESSAGES column shows correct count (messagesSent)

### CampaignAnalytics - CSV Columns
- [ ] **MP-008**: Open campaign with CSV leads
- [ ] **MP-009**: Verify CSV columns appear in leads table
- [ ] **MP-010**: Hover column header - tooltip shows normalized column name
- [ ] **MP-011**: Long values truncate with ellipsis
- [ ] **MP-012**: Hover truncated value - full value shown in tooltip
- [ ] **MP-013**: "Campaign Leads (X)" shows correct count in header

### Test API Sheet
- [ ] **MP-014**: Open API Management page
- [ ] **MP-015**: Click to open Test Add Lead sheet
- [ ] **MP-016**: Select API key from dropdown
- [ ] **MP-017**: Select campaign from dropdown (only non-draft shown)
- [ ] **MP-018**: Click "Load Example" - JSON populated
- [ ] **MP-019**: Modify lead data and click "Test API"
- [ ] **MP-020**: Success response displays with status code
- [ ] **MP-021**: Error response displays with error message
- [ ] **MP-022**: Reset button clears all fields

### Variable Selector
- [ ] **MP-023**: Open create variable dialog
- [ ] **MP-024**: Enter "123invalid" - error about starting with number
- [ ] **MP-025**: Enter "my variable" - error about spaces
- [ ] **MP-026**: Enter "my_variable" - no error, valid format message shown
- [ ] **MP-027**: Create button disabled when validation fails

### LeadsTableView
- [ ] **MP-028**: View campaign with leads in Sequence step
- [ ] **MP-029**: Column headers have info icons
- [ ] **MP-030**: Hover info icon - tooltip shows normalized column name

---

## 🟢 GOOD TO HAVE

### View Mode
- [ ] **GH-001**: Open launched campaign - verify "View Senders" (not "Edit")
- [ ] **GH-002**: Verify "View Sequence" (not "Edit")
- [ ] **GH-003**: Message editors are read-only
- [ ] **GH-004**: No copy/attachment buttons visible
- [ ] **GH-005**: Variable chips not interactive for configuration

### Character Limits
- [ ] **GH-006**: Type message approaching 1900 characters
- [ ] **GH-007**: Character counter shows correct count
- [ ] **GH-008**: Counter changes color near limit (warning)
- [ ] **GH-009**: Cannot exceed 3000 character hard limit

### Responsive Layout
- [ ] **GH-010**: Campaign list table scrolls horizontally on narrow screens
- [ ] **GH-011**: Variable dropdown fits within viewport on mobile
- [ ] **GH-012**: Config modal is scrollable if content overflows

### Keyboard Navigation
- [ ] **GH-013**: Tab through variable dropdown options
- [ ] **GH-014**: Enter key selects variable
- [ ] **GH-015**: Arrow keys navigate dropdown
- [ ] **GH-016**: Tab through fallback config radio options

### Cross-Browser
- [ ] **GH-017**: Chrome - all features work
- [ ] **GH-018**: Firefox - all features work
- [ ] **GH-019**: Safari - all features work
- [ ] **GH-020**: Edge - all features work

### Accessibility
- [ ] **GH-021**: Labels associated with form inputs
- [ ] **GH-022**: Focus indicators visible
- [ ] **GH-023**: Screen reader can navigate variable dropdown

---

## Test Data Requirements

### For CSV Variable Tests
- Campaign with CSV leads containing columns with:
  - All data present (for allLeadsPresent test)
  - Some missing data (for missing data configuration)
  
### For Variable Configuration Tests
- Use variables: `csv_company`, `linkedin_firstName`, `api_custom`

### For Campaign List Tests
- At least 2 campaigns: 1 ACTIVE, 1 DRAFT

### For Analytics Tests
- Campaign with:
  - Multiple leads (10+)
  - Various statuses (PENDING, PROCESSED, COMPLETED)
  - CSV column mapping

---

## Known Issues / Edge Cases

1. **Paste with variables**: When pasting text containing `{variableId}` format, variables should auto-convert to chips
2. **Empty messages**: Editor should show placeholder when empty
3. **Special characters**: Messages with emoji and special chars should preserve correctly
4. **Rapid clicks**: Quick successive clicks on variable chips should not cause issues

---

## Sign-off

| Tester | Date | Environment | Result |
|--------|------|-------------|--------|
|        |      |             |        |

**Notes:**

