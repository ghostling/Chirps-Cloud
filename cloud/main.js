Parse.Cloud.useMasterKey();


/**
 * Given a 'userId' and a 'message' in the request.params, push a notification
 * to the specified user with the given message.
 */
Parse.Cloud.define('pushMsgToUser', function(request, response) {
    // Get the user object to push to.
    var userId = request.params.userId;
    var user = new Parse.User();
    user.id = userId;

    var instQuery = new Parse.Query(Parse.Installation);
    instQuery.equalTo('user', user);

    Parse.Push.send({
        where: instQuery,
        data: {
            alert: request.params.message
        }
    }, {
        success: function() {
            response.success('Message pushed successfully.');
        },
        error: function (error) {
            response.error(error);
        }
    });
});


/**
 * Queries for expired chirps. If the expired chirps have been approved,
 * delete them and inform the user via a push notification.
 *
 * TODO: For expired chirps that are not approved, delete them, inform the user,
 * as well as on the admin console.
 */
Parse.Cloud.define('handleExpiredChirps', function(request, response) {
    var currentDateTime = new Date();

    var chirpQuery = new Parse.Query('Chirp');
    chirpQuery.lessThanOrEqualTo('expirationDate', currentDateTime);
    chirpQuery.equalTo('chirpApproval', true);

    chirpQuery.each(
        function(chirp) {
            var title = chirp.get('title');
            var message = 'Your chirp "' + title + '" has expired.';
            var userId = chirp.get('user').id;

            chirp.destroy();
            Parse.Cloud.run('pushMsgToUser', {
                userId: userId,
                message: message
            });
        },
        {
            success: function (chirp) {
                response.success('Expired chirps handled successfully.');
            },
            error: function(chirp, error) {
                console.log(chirp);
                console.log(error);
                response.error(error);
            }
    });

});
