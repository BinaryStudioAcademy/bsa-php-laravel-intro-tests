#!/bin/bash

GITHUB_URL=$1
TOKEN=$2
LANG="${3:-ua}"

TEMPFOLDER="temp-repo"

echo "Preparing..."
if [ -d $TEMPFOLDER ]; then
	rm -rf $TEMPFOLDER
fi
if [ -f ./result.json ]; then
	rm ./result.json
fi

echo "Checking repository link..."
REPO_EXISTS=$(. ./scripts/check-repo.sh $GITHUB_URL)
if [ $REPO_EXISTS != true ]; then
    echo "Repository is not accessable, generating error"
    $(. ./scripts/generate-repo-error.sh $TOKEN)
    exit 0
fi

echo "Cloning repository..."
mkdir $TEMPFOLDER
git clone $GITHUB_URL $TEMPFOLDER

cd $TEMPFOLDER
rm -rf tests
cp -rf ../tests ./
cp ../.php-cs-fixer.dist.php ./

rm composer.lock
composer install --ignore-platform-reqs
composer require friendsofphp/php-cs-fixer --ignore-platform-reqs

./vendor/bin/phpunit --testdox-text=report.txt
env PHP_CS_FIXER_IGNORE_ENV=true ./vendor/bin/php-cs-fixer fix --diff --config=.php-cs-fixer.dist.php --using-cache=no --dry-run --format=json ./src > code-style.json

cd ..

node scripts/generate-feedback.js \
    $TOKEN \
    $LANG \
    $PWD/$TEMPFOLDER/report.txt \
    $PWD/$TEMPFOLDER/code-style.json

#!/bin/bash

function getContainerHealth {
  docker inspect --format "{{.State.Health.Status}}" $1
}

docker run -p 3306:3306 \
	-d \
	-e MYSQL_DATABASE=test \
	-e MYSQL_USER=test \
	-e MYSQL_PASSWORD=secret \
	-e MYSQL_ROOT_PASSWORD=secret \
	--name mysql \
	--health-cmd='mysqladmin ping --silent' \
	mysql:5.6

while STATUS=$(getContainerHealth mysql); [ $STATUS != "healthy" ]; do
	if [ $STATUS == "unhealthy" ]; then
		echo "Failed!"
		exit -1
	fi
	printf .
	lf=$'\n'
	sleep 1
done
