Parse.Cloud.useMasterKey();


/**
 * Job! Does stuff periodically. Check Parse dashboard to change interval.
 */
Parse.Cloud.job('notificationJob', function(request,response) {
    Parse.Cloud.run('handleExpiredChirps', {}, {
        success: function(blah) {
            status.message('(1/2) Just finished handling expired chirps...');
        },
        error: function(error) {
            console.error('(Something went wrong with handling expired chirps.');
            status.error(error);
        }
    });
    Parse.Cloud.run('handleFavoriteChirps', {}, {
        success: function(blah) {
            status.message('(2/2) Just finished handling favorited chirps...');
        },
        error: function(error) {
            console.error('(Something went wrong with handling favorited chirps.');
            status.error(error);
        }
    });

    status.success('...done with my jobs!');
});


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
                response.error(error);
            }
    });

});


/**
 * Queries Chirps for ones that are expiring in approx. a day and sends a push
 * notification to all users that follow it.
 */
Parse.Cloud.define('handleFavoriteChirps', function(request, response) {
    var currentDateTime = new Date();
    var tomorrowDateTime = new Date();
    var millisecondsDay = 24*60*60*1000;
    tomorrowDateTime.setTime(currentDateTime.getTime() + millisecondsDay);

    var chirpQuery = new Parse.Query('Chirp');

    // Want Chirps that expire between now and tomorrow.
    chirpQuery.greaterThanOrEqualTo('expirationDate', currentDateTime);
    chirpQuery.lessThanOrEqualTo('expirationDate', tomorrowDateTime);

    chirpQuery.each(
        function(chirp) {
            var users = chirp.get('favoriting');

            if (users) {
                var title = chirp.get('title');
                var message = '"' + title + '"' + ' is happening in a day!';

                for (var i = 0; i < users.length; i++) {
                    Parse.Cloud.run('pushMsgToUser', {
                        userId: users[i],
                        message: message
                    });
                }
            }
        },
        {
            success: function(chirp) {
                response.success('Favorited chirps handled successfully.');
            },
            error: function(chirp, error) {
                console.log(chirp);
                response.error(error);
            }
    });
});
