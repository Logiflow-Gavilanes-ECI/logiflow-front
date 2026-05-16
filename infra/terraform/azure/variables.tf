variable "subscription_id" {
  description = "Azure subscription ID where the frontend storage account lives"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group that owns the frontend storage account"
  type        = string
  default     = "logiflow-frontend-rg"
}

variable "location" {
  description = "Azure region (matches backend for latency parity)"
  type        = string
  default     = "eastus2"
}

variable "storage_account_name" {
  description = <<EOT
Globally-unique name of the storage account that serves the web-admin via $web.
Must be 3-24 lowercase alphanumerics. The existing account in production is `logiflowapp`.
EOT
  type        = string
  default     = "logiflowapp"
}
