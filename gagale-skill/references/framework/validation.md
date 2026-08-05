# Validation Rules

Validation is profile-relative. Never compare a candidate with examples from a
different profile.

Reject:

- empty output;
- assistant or help-desk framing;
- visible evidence, prompt, or reasoning narration;
- exact repetition of the previous outbound message;
- normal generation from an unconfirmed profile.

Warn and require review when:

- the reply copies one retrieved source expression verbatim;
- length is far outside retrieved evidence;
- the same reply shape repeats several times;
- the reply restates the user's message instead of continuing it;
- a major life development appears without confirmation.

A validator pass does not prove the reply matches the person. The final choice
must still be grounded in confirmed files, current context, and retrieved
source evidence.
