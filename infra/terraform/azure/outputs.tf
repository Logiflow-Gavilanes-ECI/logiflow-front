output "storage_account_name" {
  description = "Name of the storage account (matches the GitHub Actions secret AZURE_STORAGE_ACCOUNT_NAME)"
  value       = azurerm_storage_account.frontend.name
}

output "primary_web_endpoint" {
  description = "Public URL of the static website ($web container)"
  value       = azurerm_storage_account.frontend.primary_web_endpoint
}

output "primary_web_host" {
  description = "Hostname only (use this for CDN origin or CORS_ORIGINS on the backend)"
  value       = azurerm_storage_account.frontend.primary_web_host
}

output "primary_access_key" {
  description = "Storage account access key (matches the GitHub Actions secret AZURE_STORAGE_ACCOUNT_KEY). Sensitive — never log or commit."
  value       = azurerm_storage_account.frontend.primary_access_key
  sensitive   = true
}
