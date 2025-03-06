---
layout: layouts/page.njk
---

## Blogroll

Download the OPML for use in your reader app: [OPML XML File](/blogs.opml.xml)

{% assign categories = collections.blogroll | map: "category" | uniq | sort %}

{% for category in categories %}
### {{ category }}

{% for blog in collections.blogroll | sort(false, false, 'blogTitle') %}
{% if blog.category == category %}
- [{{ blog.blogTitle }}]({{ blog.blogUrl }}) [RSS]({{ blog.feedUrl }})
{% endif %}
{% endfor %}

{% endfor %}
