---
title: "Building an Unstructured Data Import"
description: "Case study: knowing when to apply AI and when not to. A pragmatic look at building a data import pipeline for community resources."
date: 2024-11-16
client: "Neighbor Solutions"
---

Sometimes the hardest thing to figure out is not "how" to best apply a new technology, but "when not" to apply it. Nowhere has this been more true than with AI. With the rush to stick the AI brand on every project, software engineers are being pressured to "just throw more AI" at the problem and hope it works.

In my hourly contracting on [Neighbor Solutions](https://neighbor.solutions/), I've been asked to build a data import pipeline for community resources. To give a bit of context, one core function of the Neighbor Solutions app is to help users who have a heart for our unhoused neighbors to guide them towards helpful resources in their community. These can be food banks, shelters, warming stations, and many more. The major technical difficulty here is getting accurate data into the system in an automated way. Many times, lists of these resources are in poorly formatted PDFs or screenshots of webpages. There is very little consistency here, so some amount of natural language processing is required.

![A list of resources in a PDF given to us by a partner](https://gordonburgett.net/images/2024/neighbor-solutions-resources.png)

*A list of resources in a PDF given to us by a partner*

## When Not to apply AI

A naive solution to the problem of importing these resources would be to "throw AI at it and see what happens". Many of the latest large language models (LLMs) such as Claude and GPT-4 are multi-modal, meaning they can read and digest images and complex documents like PDFs. However, because of the information density here, we found that the naive approach to reading the PDF doesn't work. The variety of the data oversaturates the context and the LLM has trouble building an accurate table of resources without hallucinating.

Fortunately there are a ton of other methods we can apply here that still leverage NLP. The insight we had was that one document contains many resources, so if we can apply a "chunking" pass using [Semantic Similarity](https://en.wikipedia.org/wiki/Semantic_similarity) then we can efficiently find the "breaks" between resource descriptions. This takes us from a single unstructured document to a list of many unstructured paragraphs, each paragraph matching almost 1-1 with a resource to extract.

There has been a lot of great work in making chunking easier recently, since effective chunking is a core component of Retrieval-Augmented Generation ([RAG](https://aws.amazon.com/what-is/retrieval-augmented-generation/)) systems. As a small startup, whenever we have the option to buy instead of build, we prefer to shell out the money. Especially if it's a fairly inexpensive SAAS product that we're buying :)

After some research, we found [unstructured.io](https://unstructured.io/) which is a pipeline for pre-processing your unstructured data into RAG-ready chunks. They accept all kinds of documents, and apply multiple pre-processing detection passes to determine the right models to apply. This was ideal for our use case; we were able to outsource much of the engineering effort around chunking to a ready-to-go solution.

## When to apply AI

After our chunking pass, we have a JSON list of items that contain a chunk of text. These chunks mostly map 1-1 to a single resource (though sometimes a chunk contains more than one).

Here's an example:

> need to know.  
> 1  
> Community Agencies and Programs  
> ABILITY TREE  
> 1311 Ferris Ave. Ste. A, Waxahachie TX 75165  
> (214) xxx-xxxx  
> Working alongside families impacted by disability through Recreation, Education, Support, and Training (R.E.S.T.). These services can include Parent night outs (respite care), after school programming, and Support Groups, and more.

Now this is a small enough set of text that an LLM can effectively focus on the problem at hand, which is pulling out the correct fields to match our database schema. We used Anthropic Claude 3.5 Sonnet and a bit of "prompt engineering" to pull out name, address, phone, website, and description from the resource. Using the LLM's "intelligence", we can also extract any requirements such as "ID required" or "women only", as well as match resources to the kind of service that is provided. In this case we can detect "respite care" and categorize the resource as a good match for disabled persons.

## AI is a black box

AI solutions are not magic, they are engineering. Just like any other black-box system, you need to test inputs and outputs. This is more difficult with AI because the outputs are probabilistic, meaning they won't be the same every time. Therefore your tests have to apply statistics to ensure that you can be confident in the results of your system.

For our use case, we have a good prototype system in place with a solid architecture. Improvements from here are going to be incremental and require a lot of engineering effort. We need to build more observability into our system, and build feedback loops to gauge the ultimate usefulness of the AI outputs. Once we have more observability and build up a good sample of inputs and outputs, we can turn that into an automated testing framework which should give us confidence in any improvements we make to the chunking algorithm or the LLM prompts.

## Implications

AI is one of many powerful tools to apply to your problems. It is not a magic bullet. Applying AI to any particular problem is an engineering challenge that requires engineering methods to solve. As is common with any computer system, the challenge is having confidence that the system will give good results with new inputs. Getting there requires a good definition of the problem, and a well defined expectation of your results. It also requires the expertise to know when to apply AI, and when not to.
