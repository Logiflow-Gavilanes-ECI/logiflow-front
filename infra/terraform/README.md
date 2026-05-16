# LogiFlow Front — Infrastructure (Azure Storage Static Website)

Terraform module that provisions the storage account that hosts the
web-admin dashboard via Azure's built-in static website feature (the
`$web` container). No CDN: the student Azure subscription cannot enable
`Microsoft.Cdn`, so the site is served direct from
`<storage_account_name>.z<n>.web.<region>.windows.net`.

## Layout

```
azure/
├── main.tf                       resource group + storage account + $web
├── variables.tf                  subscription_id, name, region overrides
├── outputs.tf                    primary_web_endpoint, account_name, access_key (sensitive)
├── backend.tf                    remote state in azurerm (shared with the backend repo)
└── terraform.tfvars.example      copy → terraform.tfvars, fill in subscription_id
```

## First-time setup on a fresh subscription

```bash
cd infra/terraform/azure
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with your subscription_id

terraform init      # connects to the shared tfstate backend
terraform plan      # what would be created
terraform apply     # creates RG + storage account + enables $web
```

Then take the outputs and load them as GitHub Secrets on the
`logiflow-front` repo:

| Output | GH Secret |
|---|---|
| `storage_account_name` | `AZURE_STORAGE_ACCOUNT_NAME` |
| `primary_access_key`   | `AZURE_STORAGE_ACCOUNT_KEY`  |

The `deploy-web-admin.yml` workflow uses those two to upload the
built Angular bundle to `$web` via `az storage blob upload-batch`.

## Importing the existing storage account into state

The production account `logiflowapp` was created by hand before this
module existed. To bring it under Terraform management on the
subscription that already owns it (one-time):

```bash
# 1. Discover the resource group that holds it
az storage account show \
  --name logiflowapp \
  --query resourceGroup -o tsv

# 2. Import the resource group (replace <rg> with the value above)
terraform import azurerm_resource_group.frontend \
  /subscriptions/<subscription_id>/resourceGroups/<rg>

# 3. Import the storage account itself
terraform import azurerm_storage_account.frontend \
  /subscriptions/<subscription_id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/logiflowapp

# 4. terraform plan — should show NO changes (or only tag drift).
#    If drift is real (e.g. account_tier mismatch), align main.tf to what
#    Azure already has before running terraform apply.
```

After import, the storage account is fully managed by Terraform and
future changes flow through PR + `terraform apply`.

## Why no CDN

Azure CDN profiles require `Microsoft.Cdn` to be registered on the
subscription. Azure for Students disallows that resource provider. If
the team migrates to a paid subscription:

1. Add `azurerm_cdn_profile` (`Standard_Microsoft` or `Standard_Akamai`).
2. Add `azurerm_cdn_endpoint` with `origin_host_name = azurerm_storage_account.frontend.primary_web_host`.
3. Set the dashboard's public URL to the CDN endpoint instead of the
   storage account's direct URL.
4. Add an `az cdn endpoint purge` step at the end of
   `deploy-web-admin.yml` so deploys take effect immediately.
