    #!/bin/bash
    # WARNING: Don't Edit this file since it affects the Pipeline 

    # Navigate to the app directory
    cd /var/www/html/least
    git fetch
    git pull
    # Install dependencies
    echo "Installing dependencies..."
    npm install

    echo "Reloading the application..."
    pm2 reload 6

    echo "Deployment completed successfully!"
