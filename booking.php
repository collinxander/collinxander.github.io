<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars($_POST['name']);
    $phone = htmlspecialchars($_POST['phone']);
    $email = htmlspecialchars($_POST['email']);
    $package = htmlspecialchars($_POST['package']);
    $date = htmlspecialchars($_POST['date']);
    $message = htmlspecialchars($_POST['message']);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Invalid email format";
        exit();
    }

    $to = "collinxander1@gmail.com";
    $subject = "New Booking Request from $name";
    $body = "You have received a new booking request.\n\n" .
            "Name: $name\n" .
            "Phone: $phone\n" .
            "Email: $email\n" .
            "Selected Package: $package\n" .
            "Preferred Session Date: $date\n" .
            "Message/Instructions:\n$message\n";

    $headers = "From: no-reply@collinxander.com\r\n";
    $headers .= "Reply-To: $email\r\n";

    // Try sending the email and log any failures
    if (mail($to, $subject, $body, $headers)) {
        echo "Booking request sent successfully!";
    } else {
        error_log("Failed to send email.", 0);
        echo "Failed to send booking request. Please try again later.";
    }
}
?>
