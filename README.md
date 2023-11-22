# ![Restfox](https://raw.github.com/flawiddsouza/Restfox/main/packages/ui/public/pwa-192x192.png "Restfox")

# BTP Restfox

[**Usage**](#usage) **|** [**Install**](#install) **|** [**FAQ**](#faq) 


Multi-tenant BTP rest client for BTP destination testing based on [Restfox](https://github.com/flawiddsouza/Restfox)

## Usage

Follow below Installation step to setup, subscribe the app in your BTP subaccount, then use the app like Postman. 

<img src="doc/img/btp-restfox-quick-usage.png?raw=true">

## Install

### Step 1 - Download and complile the ui and the app 
```
git clone https://github.com/sap-pilot/btp-restfox-mt
cd btp-restfox-mt/app/ui
npm install
npm run build
cd ../..
npm install
npm run build
```

## Step 2 - Deploy the app to your provider BTP sub-account

```
cf login
npm run deploy
```

Create a destination **BTP_CFAPI** in your provider BTP sub-account for the app to create routes automatically for new subscribers:

<img src="doc/img/btp-restfox-cfapi.png?raw=true">

### Step 3 - Subscribe to the app in your consumer BTP sub-account

Open any consumer subaccount (within the same region as provider) BTP cockpit, navigate to **BTP Market Place -> BTP Utilities -> BTP-Restfox-MT**, click **Create** to subscribe to the app. 

<img src="doc/img/btp-restfox-subscription.png?raw=true">

Create a role from template BTP-Restfox-User then assign to role collections and users. 

Open/bookmark the "Go to application" link above to start [using the app](#usage). 

## FAQ

In case of any issue, report to: https://github.com/sap-pilot/btp-restfox-mt/issues