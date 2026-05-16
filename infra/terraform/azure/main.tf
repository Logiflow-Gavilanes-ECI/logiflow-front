terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.115"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

resource "azurerm_resource_group" "frontend" {
  name     = var.resource_group_name
  location = var.location
}

# Storage Account hosting the web-admin dashboard via the $web container.
# Direct-from-storage URL: https://<storage_account_name>.z<n>.web.<region>.windows.net/
# CDN intentionally NOT provisioned — the student Azure subscription cannot
# enable Microsoft.Cdn. If/when the team upgrades, add an azurerm_cdn_profile
# + azurerm_cdn_endpoint in front of `primary_web_host`.
resource "azurerm_storage_account" "frontend" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.frontend.name
  location                 = azurerm_resource_group.frontend.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  # Force HTTPS so the static site is never served over http.
  https_traffic_only_enabled = true
  min_tls_version            = "TLS1_2"

  # Enables the $web container under the hood. Both documents point to
  # index.html so client-side SPA routing keeps working on hard reloads.
  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }

  tags = {
    project   = "logiflow"
    component = "web-admin"
    managed   = "terraform"
  }
}
