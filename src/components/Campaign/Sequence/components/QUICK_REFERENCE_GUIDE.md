# Enhanced Variable Validation Drawer - Quick Reference Guide

## 🚀 Quick Start

### **1. Import the Component**
```tsx
import { EnhancedVariableValidationDrawer } from './EnhancedVariableValidationDrawer';
```

### **2. Basic Usage**
```tsx
<EnhancedVariableValidationDrawer
  variable={selectedVariable}
  isOpen={isDrawerOpen}
  onClose={() => setIsDrawerOpen(false)}
  csvData={csvData}
/>
```

## 🎯 Four Fix Types

| Fix Type | Button | Action | Configuration |
|----------|--------|--------|---------------|
| **Send Blank** | `[Apply]` | Leaves field empty | None |
| **Fetch from LinkedIn** | `[Configure]` | Fetches from LinkedIn | Field + Fallback |
| **Insert Default Value** | `[Apply]` | Sets default value | Value input |
| **Skip Leads** | `[Apply]` | Excludes leads | None |

## 🔧 LinkedIn Field Selection

### **Available Fields**
- **First Name** (`firstName`)
- **Last Name** (`lastName`)
- **Email Address** (`emailAddress`)
- **Current Company** (`currentCompany`)
- **Job Title** (`title`)
- **Headline** (`headline`)
- **Location** (`location`)
- **Phone Number** (`phoneNumber`)

### **Fallback Options**
1. **Send Blank** - Field remains empty
2. **Skip Leads** - Excludes leads from campaign
3. **Insert Default Value** - Uses specified value

## 📋 JSON Output Examples

### **Send Blank**
```json
{
  "columnName": "phone",
  "fixChain": { "fixType": "sendBlank" }
}
```

### **Insert Default Value**
```json
{
  "columnName": "email",
  "fixChain": {
    "fixType": "insertDefaultValue",
    "defaultValue": "no-email@example.com"
  }
}
```

### **Fetch from LinkedIn**
```json
{
  "columnName": "company",
  "fixChain": {
    "fixType": "fetchFromLinkedIn",
    "sourceField": "currentCompany",
    "fallback": {
      "fixType": "insertDefaultValue",
      "defaultValue": "Unknown Company"
    }
  }
}
```

## 🎨 UI States

### **Normal State**
- Shows missing value summary
- Displays affected rows
- Presents four fix options

### **LinkedIn Configuration**
- Dropdown for field selection
- Radio buttons for fallback options
- Input field for default value (if needed)

### **Validation States**
- ✅ **Valid**: All required fields filled
- ❌ **Invalid**: Missing required fields
- ⚠️ **Warning**: Potential issues

## 🔍 Common Use Cases

### **Email Column Missing**
1. Click "Configure" for "Fetch from LinkedIn"
2. Select "Email Address" from dropdown
3. Choose fallback: "Insert Default Value"
4. Enter: "no-email@example.com"
5. Click "Apply LinkedIn Fetch"

### **Company Column Missing**
1. Click "Configure" for "Fetch from LinkedIn"
2. Select "Current Company" from dropdown
3. Choose fallback: "Send Blank"
4. Click "Apply LinkedIn Fetch"

### **Phone Column Missing**
1. Click "Apply" for "Send Blank"
2. Done! (No additional configuration)

## 🐛 Troubleshooting

### **Modal Not Opening**
- Check if `isOpen` prop is `true`
- Verify component import
- Check console for errors

### **LinkedIn Fields Not Showing**
- Verify `LINKEDIN_FIELDS` import
- Check TypeScript types
- Ensure proper component version

### **Validation Errors**
- Check required field validation
- Verify input format
- Check console messages

## 📱 Responsive Design

### **Desktop**
- Full-width drawer (500-600px)
- Side-by-side layout
- Hover effects

### **Mobile**
- Responsive modal sizing
- Touch-friendly buttons
- Stacked layout

## 🎯 Best Practices

### **Do's**
- ✅ Always provide fallback for LinkedIn fetch
- ✅ Use descriptive default values
- ✅ Test with sample data
- ✅ Handle validation errors gracefully

### **Don'ts**
- ❌ Leave LinkedIn fallback as "Send Blank" without consideration
- ❌ Use generic default values like "N/A"
- ❌ Skip validation checks
- ❌ Ignore error messages

## 🔧 Development

### **Testing**
```tsx
// Use the test component
import { ColumnFixesTest } from './ColumnFixesTest';
<ColumnFixesTest />
```

### **Debug Mode**
```tsx
// Add console logs for debugging
console.log('Modal state:', showLinkedInModal);
console.log('Selected field:', linkedInField);
```

### **Customization**
- Modify `LINKEDIN_FIELDS` for additional fields
- Update validation rules in `columnFixesUtils.ts`
- Customize styling with Tailwind classes

## 📚 Related Files

- **Component**: `EnhancedVariableValidationDrawer.tsx`
- **Utils**: `columnFixesUtils.ts`
- **Types**: `campaigns.ts`
- **Store**: `campaignStore/campaign.ts`
- **Test**: `ColumnFixesTest.tsx`

## 🆘 Support

1. Check console for error messages
2. Verify all props are properly passed
3. Test with sample data
4. Review validation rules
5. Check component documentation
