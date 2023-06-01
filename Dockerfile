FROM php:8.2.0-cli

# Install Apache web server & supervisor
RUN apt-get update && apt-get install -y apache2 supervisor

# Install PHP extensions required for WebSocket server
RUN docker-php-ext-install sockets

# Enable required Apache modules
RUN a2enmod proxy proxy_wstunnel

# Configure Apache virtual host
COPY ./etc/apache.conf /etc/apache2/sites-available/000-default.conf

# Copy supervisor configuration
COPY ./etc/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy project files
COPY lib /var/www/lib
COPY index.php index.js index.css /var/www/html/
COPY server.php /var/www/server.php

# Expose port 80 for web server
EXPOSE 80

# Start supervisor to run Apache and PHP WebSocket server
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
