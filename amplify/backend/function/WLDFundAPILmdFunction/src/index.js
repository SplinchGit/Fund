const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

exports.handler = async (event) => {
    const path = event.path || event.rawPath;
    
    let targetFunction;
    if (path.startsWith('/auth')) {
        targetFunction = 'worldfundAuthFunction';
    } else if (path.includes('/donate') || path.startsWith('/campaigns')) {
        // Route both donation and campaign endpoints
        if (path.includes('/donate')) {
            targetFunction = 'worldfundDonationsFunction';
        } else {
            targetFunction = 'worldfundCampaignsFunction';
        }
    } else if (path.startsWith('/minikit-tx-status')) {
        targetFunction = 'worldfundAuthFunction'; // Has this endpoint
    } else if (path.startsWith('/verify-worldid')) {
        targetFunction = 'worldfundAuthFunction'; // Has this endpoint
    }
    
    if (!targetFunction) {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,Origin'
            },
            body: JSON.stringify({ message: 'Route not found' })
        };
    }

    // Get the function name with environment suffix
    const functionName = `${targetFunction}-${process.env.ENV || 'dev'}`;
    
    try {
        const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
        
        const command = new InvokeCommand({
            FunctionName: functionName,
            Payload: JSON.stringify(event),
            InvocationType: 'RequestResponse'
        });
        
        const response = await lambdaClient.send(command);
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));
        
        return payload;
    } catch (error) {
        console.error('Lambda invocation error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                message: 'Internal server error',
                error: error.message 
            })
        };
    }
};