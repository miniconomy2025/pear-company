# Pear Company DNS Records
resource "azurerm_dns_cname_record" "pear_company_web_cname" {
  name                = "pear-company"
  record              = "ec2-13-247-227-43.af-south-1.compute.amazonaws.com"
  zone_name           = data.azurerm_dns_zone.grad_projects_dns_zone.name
  resource_group_name = "the-hive"
  ttl                 = 3600
  tags                = local.common_tags
}

resource "azurerm_dns_cname_record" "pear_company_api_cname" {
  name                = "pear-company-api"
  record              = "ec2-13-245-131-46.af-south-1.compute.amazonaws.com"
  zone_name           = data.azurerm_dns_zone.grad_projects_dns_zone.name
  resource_group_name = "the-hive"
  ttl                 = 3600
  tags                = local.common_tags
}