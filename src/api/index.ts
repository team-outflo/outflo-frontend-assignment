// Import your API handlers
import * as accountsApi from './accounts/accounts';
import * as authApi from './authentication/authentication';
import * as campaignsApi from './campaign/campaigns';
import * as leadsApi from './leads/leads';
import * as variablesApi from './variables/variables';

export default function handler(req, res) {
  // Get the path from the request URL
  const path = req.url || '';
  
  // Route to appropriate handler based on path segment
  if (path.includes('/api/accounts')) {
    return accountsApi.handler(req, res);
  } else if (path.includes('/api/auth')) {
    return authApi.handler(req, res);
  } else if (path.includes('/api/campaigns')) {
    return campaignsApi.handler(req, res);
  } else if (path.includes('/api/leads')) {
    return leadsApi.handler(req, res);
  } else if (path.includes('/api/variables')) {
    return variablesApi.handler(req, res);
  }
  
  return res.status(404).json({ error: 'API endpoint not found' });
}