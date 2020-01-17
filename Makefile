# ---------------------------
# Generated by rel-engage

# This task tells make how to 'build' n-gage. It npm installs n-gage, and # Once that's done it overwrites the file with its own contents - this
# ensures the timestamp on the file is recent, so make won't think the file
# is out of date and try to rebuild it every time
node_modules/@financial-times/rel-engage/index.mk:
	@echo "Updating rel-engage"
	@npm install --save-dev @financial-times/rel-engage
	@touch $@

# If, by the end of parsing your `Makefile`, `make` finds that any files
# referenced with `-include` don't exist or are out of date, it will run any
# tasks it finds that match the missing file. So if n-gage *is* installed
# it will just be included; if not, it will look for a task to run
-include node_modules/@financial-times/rel-engage/index.mk

# End generated by rel-engage
# ---------------------------

NEO4J_BOLT_URL=bolt://localhost:7687

env:
	echo "No secret environment variables needed in test"

verify:

unprepublish:
	sed s/"dist\/"/"src\/"/ packages/tc-ui/package.json > tmp && mv tmp packages/tc-ui/package.json


# note that this invokes npm install, and in package.json there is a postinstall script
# defined too, which installs all the node_modules for the packages
install: unprepublish

prepublish:
	babel packages/tc-ui/src -D --out-dir packages/tc-ui/dist
	sed s/"src\/"/"dist\/"/ packages/tc-ui/package.json > tmp && mv tmp packages/tc-ui/package.json

monorepo-publish: prepublish
	npx athloi version --concurrency 10 $(CIRCLE_TAG)
	npx athloi publish --concurrency 10 -- --access public

.PHONY: test

.PHONY: cypress-open
cypress-open: ## cypress-open: Opens the Cypress.io Electron test runner. Expects a local application server to be running concurrently.
	TREECREEPER_TEST=true \
	cypress open

deploy-aws:
	aws cloudformation deploy --stack-name biz-ops-kinesis --template-body file://$(shell pwd)/aws/cloudformation/biz-ops-kinesis.yaml

test: init-db
	@if [ -z $(CI) ]; \
		then TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 \
			jest --config="./jest.config.js" "${pkg}.*__tests__.*/${spec}.*.spec.js" --testEnvironment=node --watch; \
		else TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema \
			jest --config="./jest.config.js" "__tests__.*/*.spec.js" --testEnvironment=node --maxWorkers=1 --ci --reporters=default --reporters=jest-junit --detectOpenHandles --forceExit; \
	fi

run-app:
	TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema nodemon --inspect demo/api.js

build-statics:
	@if [ -z $(CI) ]; \
		then ./node_modules/.bin/webpack-dev-server --mode=production;
		else webpack-dev-server --mode development;
	fi

run-db:
	docker-compose up

run:
	@concurrently "make run-db" "make build-statics" "make run-app"

init-db:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema packages/tc-api-db-manager/index.js

clean-deps: unprepublish
	rm -rf packages/*/node_modules
	rm -rf node_modules
	rm package-lock.json
	npm install
