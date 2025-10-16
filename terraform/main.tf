terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  backend "s3" {
    region = var.region_name
  }
}

provider "aws" {
  region = var.region_name
}

# ---------------------------------------------------------------------
# Custom VPC and Subnets
# ---------------------------------------------------------------------
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "pear_main_vpc"
  }
}

data "aws_availability_zones" "available_zones" {}

resource "aws_subnet" "main_subnet_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = data.aws_availability_zones.available_zones.names[0]

  tags = {
    Name = "pear_subnet_a"
  }
}

resource "aws_subnet" "main_subnet_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available_zones.names[1]

  tags = {
    Name = "pear_subnet_b"
  }
}

# ---------------------------------------------------------------------
# Internet Gateway & Public Route Table
# ---------------------------------------------------------------------
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "pear_main_igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "pear_public_rt"
  }
}

resource "aws_route_table_association" "subnet_a" {
  subnet_id      = aws_subnet.main_subnet_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "subnet_b" {
  subnet_id      = aws_subnet.main_subnet_b.id
  route_table_id = aws_route_table.public.id
}

# ---------------------------------------------------------------------
# DB Subnet Group (only public subnets)
# ---------------------------------------------------------------------
resource "aws_db_subnet_group" "pear_db_subnet_group" {
  name       = "pear_db_subnet_group"
  subnet_ids = [aws_subnet.main_subnet_a.id, aws_subnet.main_subnet_b.id]

  tags = {
    Name = "pear_db_subnet_group"
  }
}

# ---------------------------------------------------------------------
# Security Groups
# ---------------------------------------------------------------------
resource "aws_security_group" "allow_postgres" {
  name_prefix = "allow_postgres_"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "allow_postgres"
  }
}

resource "aws_security_group" "ec2_security_group" {
  name_prefix = "pear_api_sg"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 444
    to_port     = 444
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ec2_security_group"
  }
}

# ---------------------------------------------------------------------
# Secrets for Postgres
# ---------------------------------------------------------------------
data "aws_secretsmanager_secret_version" "postgresuser" {
  secret_id = "postgresuser"
}

data "aws_secretsmanager_secret_version" "postgrespass" {
  secret_id = "postgrespass"
}

# ---------------------------------------------------------------------
# RDS Instance
# ---------------------------------------------------------------------
resource "aws_db_instance" "peardb" {
  identifier             = "peardb"
  engine                 = "postgres"
  engine_version         = "16.8"
  instance_class         = "db.t4g.micro"
  db_name                = "peardb"
  allocated_storage      = 20
  storage_type           = "gp2"
  publicly_accessible    = true
  username               = data.aws_secretsmanager_secret_version.postgresuser.secret_string
  password               = data.aws_secretsmanager_secret_version.postgrespass.secret_string
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.allow_postgres.id]
  db_subnet_group_name   = aws_db_subnet_group.pear_db_subnet_group.name

  tags = {
    Name = "peardb"
  }
}

output "db_host" {
  value       = aws_db_instance.peardb.endpoint
  description = "The endpoint of the Postgres Server RDS instance"
}

# ---------------------------------------------------------------------
# Conditional EC2 Key Pair Creation + Secret Storage
# ---------------------------------------------------------------------
locals {
  create_api_key = false
  create_web_key = fasle
}

resource "tls_private_key" "api_key" {
  count     = local.create_api_key ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "api_key_pair" {
  count      = local.create_api_key ? 1 : 0
  key_name   = "pear-api-key"
  public_key = tls_private_key.api_key[0].public_key_openssh
}

resource "aws_secretsmanager_secret" "api_private_key" {
  count       = local.create_api_key ? 1 : 0
  name        = "pear-api-private-key"
  description = "Private key for Pear API EC2 instance"
}

resource "aws_secretsmanager_secret_version" "api_private_key_version" {
  count         = local.create_api_key ? 1 : 0
  secret_id     = aws_secretsmanager_secret.api_private_key[0].id
  secret_string = tls_private_key.api_key[0].private_key_pem
}

resource "tls_private_key" "web_key" {
  count     = local.create_web_key ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "web_key_pair" {
  count      = local.create_web_key ? 1 : 0
  key_name   = "pear-web-key"
  public_key = tls_private_key.web_key[0].public_key_openssh
}

resource "aws_secretsmanager_secret" "web_private_key" {
  count       = local.create_web_key ? 1 : 0
  name        = "pear-web-private-key"
  description = "Private key for Pear Web EC2 instance"
}

resource "aws_secretsmanager_secret_version" "web_private_key_version" {
  count         = local.create_web_key ? 1 : 0
  secret_id     = aws_secretsmanager_secret.web_private_key[0].id
  secret_string = tls_private_key.web_key[0].private_key_pem
}

# ---------------------------------------------------------------------
# EC2 Instances
# ---------------------------------------------------------------------
resource "aws_instance" "pear_api_ec2_instance" {
  ami                    = "ami-0b7e05c6022fc830b"
  instance_type          = "t3.micro"
  key_name               = "pear-api-key"
  subnet_id              = aws_subnet.main_subnet_a.id
  vpc_security_group_ids = [aws_security_group.ec2_security_group.id]

  tags = {
    Name = "pear_api_ec2_instance"
  }
}

resource "aws_instance" "pear_web_ec2_instance" {
  ami                    = "ami-0b7e05c6022fc830b"
  instance_type          = "t3.micro"
  key_name               = "pear-web-key"
  subnet_id              = aws_subnet.main_subnet_b.id
  vpc_security_group_ids = [aws_security_group.ec2_security_group.id]

  tags = {
    Name = "pear_web_ec2_instance"
  }
}

# ---------------------------------------------------------------------
# Budget & EIPs
# ---------------------------------------------------------------------
resource "aws_budgets_budget" "pear_budget" {
  name              = "pear_budget"
  budget_type       = "COST"
  limit_amount      = "25"
  limit_unit        = "USD"
  time_period_start = "2025-10-16_00:00"
  time_period_end   = "2025-11-16_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "EQUAL_TO"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "EQUAL_TO"
    threshold                  = 75
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_notification_emails
  }
}

resource "aws_eip" "pear_api_ec2_eip" {
  instance = aws_instance.pear_api_ec2_instance.id
  domain   = "vpc"

  tags = {
    Name = "pear_api_eip"
  }
}

resource "aws_eip" "pear_web_ec2_eip" {
  instance = aws_instance.pear_web_ec2_instance.id
  domain   = "vpc"

  tags = {
    Name = "pear_web_eip"
  }
}

output "api_ec2_host" {
  value       = aws_eip.pear_api_ec2_eip.public_dns
  description = "The endpoint of the EC2 instance for API"
}

output "web_ec2_host" {
  value       = aws_eip.pear_web_ec2_eip.public_dns
  description = "The endpoint of the EC2 instance for WebApp"
}
