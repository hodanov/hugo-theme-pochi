---
title: "Contact"
slug: "contact"
summary: "Please use this form for inquiries and the like."
---

Please use this form for inquiries and the like.

<form method="POST" action="https://formspree.io/f/mzbqaqdk">
  <div class="mb-3">
    <label class="form-label" for="name">
      Name
      <span class="label label-default required">*</span>
    </label>
    <input id="name" class="form-control" name="name" type="text" required="">
  </div>
  <div class="mb-3">
    <label class="form-label" for="email">
      E-mail
      <span class="label label-default required">*</span>
    </label>
    <input id="email" class="form-control" name="email" type="email" required="">
  </div>
  <div class="mb-3">
    <label class="form-label" for="message">
      Message
      <span class="label label-default required">*</span>
    </label>
    <textarea id="message" class="form-control" name="message" rows="5" required=""></textarea>
  </div>
  <div class="mb-3">
    <button type="submit" class="form-control btn btn-primary">送信</button>
  </div>
</form>
