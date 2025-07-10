variable "budget_notification_emails" {
  description = "List of email addresses to receive AWS Budget notifications"
  type        = list(string)
  default     = [
    "carl.ndlovu@bbd.co.za",
    "franco.dubuisson@bbd.co.za",
    "kgotlelelo.mangene@bbd.co.za",
    "kholofelo.lekala@bbd.co.za",
    "rudolphe@bbdsoftware.com"
  ]
}

variable "region_name" {
    description = "AWS Region"
    type        = string
    default     = "af-south-1"
}