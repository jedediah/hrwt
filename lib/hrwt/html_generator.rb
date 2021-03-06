require "json"
require "pp"
require "rubygems"
require "hpricot"
require "hpricot/xchar"


module HRWT
    
    class HTMLGenerator

        def new_elem(name, attributes, children)
          elem = Hpricot::Elem.new(Hpricot::STag.new(name), children)
          for k, v in attributes
            elem[k] = v if v
          end
          return elem
        end

        def new_elem_with_converted_children(name, attributes, children, context)
          return new_elem(name, attributes, convert_elems(children, context))
        end

        def new_text(text)
          # It seems escaping " to &quot; doesn't work in <script> in Firefox.
          escaped = text.gsub(/&/, "&amp;").gsub(/</, "&lt;").gsub(/>/, "&gt;")
          return Hpricot::Text.new(escaped)
        end
        
        def new_id(base_name)
          return nil if !base_name
          id = "#{base_name}.#{@next_serial}"
          @next_serial += 1
          return id
        end

        def convert_elems(elems, context)
          return elems.map(){ |c| convert(c, context) }.flatten()
        end

        def convert(src, context)
          case src
            when Hpricot::Doc
              out = Hpricot::Doc.new()
              out.children = convert_elems(src.children, context)
              return out
            when Hpricot::Elem
              attr = src.attributes
              local_id = attr["id"]
              if local_id
                base_name = (context["scope"] ? context["scope"] + "." : "") + local_id
              else
                base_name = nil
              end
              if attr["repeat"]
                raise("element with repeat must have id") if !base_name
                repeat = attr["repeat"].to_i()
                context["structure"][local_id] = structure = {"repeat" => repeat}
                elems = []
                id = "#{base_name}.template"
                structure["template"] = {"\$id" => id}
                elems << new_elem_with_converted_children(
                  src.name,
                  attr.merge({
                    "repeat" => nil, "id" => id,
                    "style" => "display: none;"
                  }),
                  src.children,
                  context.merge({"scope" => base_name, "structure" => structure["template"]}))
                repeat.times() do |i|
                  id = new_id(base_name)
                  structure[i.to_s()] = {"\$id" => id}
                  elems << new_elem_with_converted_children(
                    src.name,
                    attr.merge({"repeat" => nil, "id" => id}),
                    src.children,
                    context.merge({"scope" => base_name, "structure" => structure[i.to_s()]}))
                end
                return elems
              else
                id = new_id(base_name)
                context["structure"][local_id] = {"\$id" => id} if local_id
                return new_elem_with_converted_children(
                  src.name, attr.merge({"id" => id}), src.children, context)
              end
            when Hpricot::Text
              return src
            else
              return src
          end
        end
        
        def generate(template_path, action)
          @next_serial = 0
          src = Hpricot.XML(File.read(template_path))
          structure = {}
          out = Hpricot.XML(File.read("etc/hrwt/template.xhtml"))
          for elem in convert_elems(src.root.children, {"structure" => structure})
            next if !elem.is_a?(Hpricot::Elem)
            if ["head", "body"].include?(elem.name)
              out.search(elem.name)[0].children += elem.children
            else
              raise("unexpected top-level tag")
            end
          end
          structure['$nextSerial'] = @next_serial
          script = "window.hrwt_iseq_url = 'iseq/%s';\n" % action
          script << "window.hrwt_view_structure = %s;\n" % structure.to_json()
          script_elem = out.search('#generated_script')[0]
          script_elem.children.push(new_text(script))
          #PP.pp(structure)
          return out.to_s()
        end
    
    end
    
end


if __FILE__ == $0
  puts HRWT::HTMLGenerator.new.generate(ARGV[0], "chat").to_s()
end
