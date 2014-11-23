/**
 * Given a 'userId' and a 'message' in the request.params, push a notification
 * to the specified user with the given message.
 */
Parse.Cloud.define("pushMsgToUser", function(request, response) {
    // Get the user object to push to.
    var userId = request.params.userId;
    var user = new Parse.User();
    user.id = userId;

    var instQuery = new Parse.Query(Parse.Installation);
    instQuery.equalTo("user", user);

    Parse.Push.send({
        where: instQuery,
        data: {
            alert: request.params.message
        }
    }, {
        success: function() {
            response.success("success");
        },
        error: function (error) {
            response.error(error);
        }
    });
});

