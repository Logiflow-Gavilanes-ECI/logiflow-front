terraform {
  # Remote state lives in the same Azure Storage backend the backend repo
  # uses, with a distinct key. Locking + concurrent-apply safety come from
  # the storage account's lease semantics.
  backend "azurerm" {
    resource_group_name  = "logiflow-tfstate-rg"
    storage_account_name = "logiflowtfstate0c0f33"
    container_name       = "tfstate"
    key                  = "logiflow-front.tfstate"
  }
}
